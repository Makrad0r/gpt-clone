import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'

export class SendMessageDto {
  @IsString()
  @MaxLength(20000)
  content!: string

  @IsOptional()
  @IsUrl()
  imageUrl?: string
}